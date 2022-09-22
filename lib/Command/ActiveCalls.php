<?php

declare(strict_types=1);
/**
 * @copyright Copyright (c) 2020 Joas Schilling <coding@schilljs.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\Talk\Command;

use OC\Core\Command\Base;
use OCA\Talk\Participant;
use OCP\IDBConnection;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ActiveCalls extends Base {
	protected IDBConnection $connection;

	public function __construct(IDBConnection $connection) {
		parent::__construct();

		$this->connection = $connection;
	}

	protected function configure(): void {
		parent::configure();

		$this
			->setName('talk:active-calls')
			->setDescription('Allows you to check if calls are currently in process')
			->addOption(
				'details',
				'd',
				InputOption::VALUE_NONE,
				'List the number of participants per call'
			)
		;
	}

	protected function execute(InputInterface $input, OutputInterface $output): int {
		if ($input->getOption('details')) {
			return $this->executeDetails($input, $output);
		}

		return $this->executeSummary($input, $output);
	}

	protected function executeSummary(InputInterface $input, OutputInterface $output): int {
		$query = $this->connection->getQueryBuilder();

		$query->select($query->func()->count('*', 'num_calls'))
			->from('talk_rooms')
			->where($query->expr()->isNotNull('active_since'));

		$result = $query->executeQuery();
		$numCalls = (int) $result->fetchColumn();
		$result->closeCursor();

		if ($numCalls === 0) {
			if ($input->getOption('output') === 'plain') {
				$output->writeln('<info>No calls in progress</info>');
			} else {
				$data = ['calls' => 0, 'participants' => 0];
				$this->writeArrayInOutputFormat($input, $output, $data);
			}
			return 0;
		}

		$query = $this->connection->getQueryBuilder();
		$query->select($query->func()->count('*', 'num_participants'))
			->from('talk_sessions')
			->where($query->expr()->gt('in_call', $query->createNamedParameter(Participant::FLAG_DISCONNECTED)))
			->andWhere($query->expr()->gt('last_ping', $query->createNamedParameter(time() - 60)));

		$result = $query->executeQuery();
		$numParticipants = (int) $result->fetchColumn();
		$result->closeCursor();


		if ($input->getOption('output') === 'plain') {
			$output->writeln(sprintf('<error>There are currently %1$d calls in progress with %2$d participants</error>', $numCalls, $numParticipants));
		} else {
			$data = ['calls' => $numCalls, 'participants' => $numParticipants];
			$this->writeArrayInOutputFormat($input, $output, $data);
		}
		return 1;
	}

	protected function executeDetails(InputInterface $input, OutputInterface $output): int {
		$query = $this->connection->getQueryBuilder();
		$subQuery = $this->connection->getQueryBuilder();
		$subQuery->select('attendee_id')
			->from('talk_sessions')
			->where($subQuery->expr()->gt('in_call', $query->createNamedParameter(Participant::FLAG_DISCONNECTED)))
			->andWhere($subQuery->expr()->gt('last_ping', $query->createNamedParameter(time() - 60)))
			->addGroupBy('attendee_id');

		$query->select('r.token', $query->func()->count('*', 'num_attendees'))
			->from('talk_attendees', 'a')
			->leftJoin('a', 'talk_rooms', 'r', $query->expr()->eq('a.room_id', 'r.id'))
			->where($query->expr()->in('a.id', $query->createFunction('(' . $subQuery->getSQL() . ')')))
			->groupBy('a.room_id');

		$data = [];
		$result = $query->executeQuery();
		while ($row = $result->fetch()) {
			$key = (string) $row['token'];
			if ($input->getOption('output') === Base::OUTPUT_FORMAT_PLAIN) {
				$key = '"' . $key . '"';
			}

			$data[$key] = (int) $row['num_attendees'];
		}
		$result->closeCursor();

		if ($input->getOption('output') === Base::OUTPUT_FORMAT_PLAIN) {
			$numCalls = count($data);
			$numParticipants = array_sum($data);

			if (empty($data)) {
				$output->writeln('<info>No calls in progress</info>');
			} else {
				$output->writeln(sprintf('<error>There are currently %1$d calls in progress with %2$d participants</error>', $numCalls, $numParticipants));
			}
		}

		$this->writeArrayInOutputFormat($input, $output, $data);
		return empty($data) ? 0 : 1;
	}
}
